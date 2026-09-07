export const categories = [
  { id: "roads", label: "Roads & footpaths", description: "Potholes and damaged walkways" },
  { id: "drainage", label: "Drainage & sewage", description: "Waterlogging and blocked drains" },
  { id: "sanitation", label: "Garbage & sanitation", description: "Uncollected waste and dumping" },
  { id: "streetlights", label: "Street lighting", description: "Broken or nonworking streetlights" },
  { id: "mosquitoes", label: "Mosquitoes", description: "Nuisance and suspected breeding sites" },
  { id: "noise", label: "Noise disturbance", description: "Neighbourhood and late-night noise" },
  { id: "internet", label: "Internet & telecom", description: "Outages and connectivity problems" },
  { id: "animals", label: "Street dogs & animals", description: "Animal concerns and reported nuisance" },
  { id: "water", label: "Drinking water", description: "Supply interruptions and quality concerns" },
  { id: "electricity", label: "Electricity", description: "Outages and damaged infrastructure" },
  { id: "other", label: "Other concerns", description: "Any other neighbourhood issue" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type UserRole = "citizen" | "officer" | "solver";
