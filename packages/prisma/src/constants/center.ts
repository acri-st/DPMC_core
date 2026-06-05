import type { Prisma } from "../../dist/client.js";

export const centers: Prisma.DataCenterCreateInput[] = [
  {
    name: "ACRI-ST Cerga",
    code: "ACR",
    latitude: 43.7547,
    longitude: 6.9224,
    // gCO2 per kWh — French grid mix is roughly 50–80 depending on the
    // hour and source (RTE / electricityMap). 60 is a fair midpoint.
    emissionFactor: 60,
    energyIntensity: 0.02,
    pue: 1.5,
  },
];
