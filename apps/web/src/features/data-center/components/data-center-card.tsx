import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, BoltIcon, MapPinIcon } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import type { DataCenter } from '@/features/data-center/services/data-center.service';

type DataCenterCardProps = {
  dataCenter: DataCenter;
};

export function DataCenterCard({ dataCenter }: DataCenterCardProps) {
  return (
    <Link
      to="/data-center/$id"
      params={{ id: String(dataCenter.id) }}
      className="group focus-visible:ring-ring/50 rounded-md focus-visible:outline-none focus-visible:ring-2"
    >
      <Card className="hover:border-primary/40 hover:shadow-sm h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate">{dataCenter.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {dataCenter.code}
                </Badge>
                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  <MapPinIcon className="size-3" />
                  {dataCenter.latitude.toFixed(2)},{' '}
                  {dataCenter.longitude.toFixed(2)}
                </span>
              </CardDescription>
            </div>
            <ArrowRightIcon className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
          <Metric
            icon={<BoltIcon className="size-3.5" />}
            label="PUE"
            value={dataCenter.pue.toFixed(2)}
          />
          <Metric
            label="Emission"
            value={`${dataCenter.emissionFactor} g/kWh`}
          />
          <Metric
            label="Energy"
            value={`${dataCenter.energyIntensity} kWh/Go`}
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide">
        {icon}
        {label}
      </span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
}
