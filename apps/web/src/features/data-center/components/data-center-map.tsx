import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useResolvedTheme } from '@/shared/components/theme-applier';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import { cn } from '@/shared/utils';
import type { DataCenter } from '@/features/data-center/services/data-center.service';

type DataCenterMapProps = {
  dataCenters: DataCenter[];
  selectedId?: number;
  onSelect?: (id: number) => void;
  /** Default zoom when there's only one or zero data centers. */
  fallbackZoom?: number;
  className?: string;
};

const LIGHT_TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

const DARK_TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

export function DataCenterMap({
  dataCenters,
  selectedId,
  onSelect,
  fallbackZoom = 4,
  className,
}: DataCenterMapProps) {
  const resolvedTheme = useResolvedTheme();
  const tiles = resolvedTheme === 'dark' ? DARK_TILES : LIGHT_TILES;
  const navigate = useNavigate();

  const center = useMemo<[number, number]>(() => {
    if (dataCenters.length === 0) return [20, 0];
    const lat =
      dataCenters.reduce((acc, dc) => acc + dc.latitude, 0) /
      dataCenters.length;
    const lng =
      dataCenters.reduce((acc, dc) => acc + dc.longitude, 0) /
      dataCenters.length;
    return [lat, lng];
  }, [dataCenters]);

  return (
    <div
      className={cn(
        'bg-card relative overflow-hidden rounded-md border',
        className,
      )}
    >
      <MapContainer
        center={center}
        zoom={fallbackZoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        worldCopyJump
      >
        <TileLayer
          // Force re-render of the layer when theme changes.
          key={tiles.url}
          attribution={tiles.attribution}
          url={tiles.url}
        />
        <FitBounds dataCenters={dataCenters} fallbackZoom={fallbackZoom} />
        {dataCenters.map((dc) => {
          const isSelected = dc.id === selectedId;
          return (
            <CircleMarker
              key={dc.id}
              center={[dc.latitude, dc.longitude]}
              radius={isSelected ? 9 : 7}
              pathOptions={{
                color: 'oklch(0.52 0.105 223.128)',
                fillColor: 'oklch(0.52 0.105 223.128)',
                fillOpacity: isSelected ? 0.9 : 0.55,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelect) {
                    onSelect(dc.id);
                  } else {
                    navigate({
                      to: '/data-center/$id',
                      params: { id: String(dc.id) },
                    });
                  }
                },
              }}
            >
              <Popup>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-semibold">{dc.name}</span>
                  <span className="font-mono text-[11px]">{dc.code}</span>
                  <span className="text-muted-foreground">
                    PUE {dc.pue.toFixed(2)} · {dc.emissionFactor} g/kWh
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function FitBounds({
  dataCenters,
  fallbackZoom,
}: {
  dataCenters: DataCenter[];
  fallbackZoom: number;
}) {
  const map = useMap();

  useMemo(() => {
    if (dataCenters.length === 0) return;
    if (dataCenters.length === 1) {
      const [dc] = dataCenters;
      map.setView([dc.latitude, dc.longitude], fallbackZoom);
      return;
    }
    const bounds = L.latLngBounds(
      dataCenters.map((dc) => [dc.latitude, dc.longitude]),
    );
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [dataCenters, map, fallbackZoom]);

  return null;
}
