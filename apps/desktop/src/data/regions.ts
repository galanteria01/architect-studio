export interface Region {
  id: string;
  label: string;
}

export const REGIONS: Region[] = [
  { id: "us-east-1", label: "US East (N. Virginia)" },
  { id: "us-west-2", label: "US West (Oregon)" },
  { id: "eu-west-1", label: "EU (Ireland)" },
  { id: "eu-central-1", label: "EU (Frankfurt)" },
  { id: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { id: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { id: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { id: "sa-east-1", label: "South America (São Paulo)" },
];

export function regionLabel(id: string): string {
  return REGIONS.find((r) => r.id === id)?.label ?? id;
}
