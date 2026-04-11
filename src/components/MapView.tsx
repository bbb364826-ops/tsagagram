"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import type { MapPost } from "@/app/map/page";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createPhotoIcon(imageUrl: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid #c9a84c;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
      <img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover" />
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function FitBounds({ posts }: { posts: MapPost[] }) {
  const map = useMap();
  useEffect(() => {
    if (posts.length > 0) {
      const bounds = L.latLngBounds(posts.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [posts, map]);
  return null;
}

export default function MapView({ posts, onSelect }: { posts: MapPost[]; onSelect: (p: MapPost) => void }) {
  const center: [number, number] = posts.length > 0 ? [posts[0].lat, posts[0].lng] : [41.7151, 44.8271]; // Tbilisi

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <FitBounds posts={posts} />
      {posts.map(post => (
        <Marker
          key={post.id}
          position={[post.lat, post.lng]}
          icon={createPhotoIcon(post.images[0])}
          eventHandlers={{ click: () => onSelect(post) }}
        >
          <Popup>
            <div style={{ width: 120 }}>
              <div style={{ width: "100%", height: 80, position: "relative", borderRadius: 8, overflow: "hidden" }}>
                <Image src={post.images[0]} alt="" fill style={{ objectFit: "cover" }} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600 }}>@{post.user.username}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
