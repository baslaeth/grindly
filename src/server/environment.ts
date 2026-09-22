import "server-only";
import { parseEnvironment } from "@/config/environment";

export function getEnvironment() {
  return parseEnvironment(process.env);
}
