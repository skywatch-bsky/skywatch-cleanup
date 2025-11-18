import { readFileSync } from "fs";
import { join } from "path";
import YAML from "js-yaml";

export interface PolicyConfig {
  label: string;
  tolabel: boolean;
  policy: string;
}

export function loadPolicy(policyName: string): PolicyConfig {
  const policyPath = join(
    process.cwd(),
    "src",
    "policies",
    `${policyName}.yml`,
  );
  const content = readFileSync(policyPath, "utf-8");
  const config = YAML.load(content) as PolicyConfig;

  if (!config.label || config.tolabel === undefined || !config.policy) {
    throw new Error(`Invalid policy format in ${policyName}.yaml`);
  }

  return config;
}
