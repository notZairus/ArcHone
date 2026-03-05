import fs from "fs";

export const getConfig = () => {
  if (!fs.existsSync(process.cwd() + "/" + "archone.config.json")) {
    return {};
  }
  const content = fs.readFileSync(process.cwd() + "/" + "archone.config.json");
  const parsed = JSON.parse(content);
  return parsed;
};
