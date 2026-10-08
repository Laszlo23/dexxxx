import { spawn } from "node:child_process";

const STATUS = "\n__CURL_STATUS__";

async function curlRpc(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const method = init?.method ?? "POST";
  const body =
    typeof init?.body === "string"
      ? init.body
      : init?.body
        ? await new Response(init.body).text()
        : "";

  return new Promise((resolve, reject) => {
    const child = spawn(
      "curl",
      [
        "-sS",
        "-X",
        method,
        url,
        "-H",
        "content-type: application/json",
        "--data-binary",
        "@-",
        "-w",
        `${STATUS}%{http_code}`,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => child.kill(), 20_000);
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks).toString("utf8");
      const marker = output.lastIndexOf(STATUS);
      if (code !== 0 || marker === -1) {
        reject(new Error(`RPC curl failed (${code ?? "unknown"})`));
        return;
      }
      const status = Number(output.slice(marker + STATUS.length));
      const text = output.slice(0, marker);
      resolve(
        new Response(text, {
          status: Number.isFinite(status) && status > 0 ? status : 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    child.stdin.end(body);
  });
}

export async function rpcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    if (response.status !== 403) return response;
    const preview = (await response.clone().text()).slice(0, 120);
    if (!preview.includes("Just a moment") && !preview.includes("<!DOCTYPE")) return response;
  } catch {
    return curlRpc(input, init);
  }
  return curlRpc(input, init);
}
