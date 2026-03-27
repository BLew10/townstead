"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface BusinessMapProps {
  lat?: number;
  lng?: number;
  name?: string;
  address?: string;
}

function MapInner({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const [mounted, setMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import("react-leaflet")["MapContainer"];
    TileLayer: typeof import("react-leaflet")["TileLayer"];
    Marker: typeof import("react-leaflet")["Marker"];
    Popup: typeof import("react-leaflet")["Popup"];
  } | null>(null);

  useEffect(() => {
    import("leaflet/dist/leaflet.css");

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });

    import("react-leaflet").then((mod) => {
      setMapComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        Marker: mod.Marker,
        Popup: mod.Popup,
      });
      setMounted(true);
    });
  }, []);

  if (!mounted || !MapComponents) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md bg-muted">
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: "12rem", width: "100%", borderRadius: "0.375rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}

export function BusinessMap({ lat, lng, name, address }: BusinessMapProps) {
  if (!lat || !lng) {
    if (!address) return null;

    return (
      <div className="rounded-lg border bg-muted/30 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span>{address}</span>
        </div>
        <div className="mt-2 flex h-48 items-center justify-center rounded-md bg-muted">
          <span className="text-sm text-muted-foreground">
            Map unavailable — no coordinates on file
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <MapInner lat={lat} lng={lng} name={name ?? "Business"} />
    </div>
  );
}
