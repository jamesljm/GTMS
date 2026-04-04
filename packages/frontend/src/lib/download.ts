import { api } from "./api";

export async function downloadFile(url: string, fallbackFilename: string) {
  const response = await api.get(url, { responseType: "blob" });
  const blob = new Blob([response.data]);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fallbackFilename;
  link.click();
  URL.revokeObjectURL(link.href);
}
