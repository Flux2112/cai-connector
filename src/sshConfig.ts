import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function updateSshConfig(port: string): boolean {
  if (!port || !/^\d+$/.test(port)) {
    return false;
  }

  const sshDir = path.join(os.homedir(), ".ssh");
  const configFile = path.join(sshDir, "config");
  fs.mkdirSync(sshDir, { recursive: true });

  const content = fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : "";

  const newBlock = `Host cml\n  HostName localhost\n  Port ${port}\n  User cdsw`;
  const pattern = new RegExp("^Host\\s+cml\\s*\\n(?:^[ \\t]+\\S.*\\n?)*", "gm");

  const matches = content.match(pattern);
  let updated = content;

  if (matches && matches.length > 1) {
    updated = updated.replace(pattern, "");
    updated = updated.replace(/\n{3,}/g, "\n\n");
  }

  if (updated.match(pattern)) {
    updated = updated.replace(pattern, newBlock);
  } else {
    if (updated.trim()) {
      if (!updated.endsWith("\n\n")) {
        updated = updated.endsWith("\n") ? updated + "\n" : updated + "\n\n";
      }
      updated += newBlock + "\n";
    } else {
      updated = newBlock + "\n";
    }
  }

  fs.writeFileSync(configFile, updated, "utf8");

  const finalMatches = updated.match(pattern);
  return !!finalMatches && finalMatches.length === 1;
}
