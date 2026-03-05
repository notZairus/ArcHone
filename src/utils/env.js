import os from "os";
import path from "path";
import fs from "fs";

export const saveToEnv = (key, value) => {
  const envPath = path.join(os.homedir(), ".archone_env");
  let envConfig = {};

  if (fs.existsSync(envPath)) {
    const existingConfig = fs.readFileSync(envPath, "utf-8");
    envConfig = JSON.parse(existingConfig);
  }

  envConfig[key] = value;
  fs.writeFileSync(envPath, JSON.stringify(envConfig));
};

export const getEnv = () => {
  const envPath = path.join(os.homedir(), ".archone_env");

  if (fs.existsSync(envPath)) {
    const existingConfig = fs.readFileSync(envPath, "utf-8");
    return JSON.parse(existingConfig);
  }

  return {};
};

export const deleteEnv = (key) => {
  const envPath = path.join(os.homedir(), ".archone_env");

  if (fs.existsSync(envPath)) {
    const existingConfig = fs.readFileSync(envPath, "utf-8");
    const envConfig = JSON.parse(existingConfig);

    delete envConfig[key];
    fs.writeFileSync(envPath, JSON.stringify(envConfig));
  }
};
