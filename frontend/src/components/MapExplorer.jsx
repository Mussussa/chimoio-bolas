import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Crosshair, MapPin, Navigation } from "lucide-react";
import { api } from "../api.js";

const chimoio = [-19.1164, 33.4833];

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapExplorer({ stores, onOpenStore }) {
  const [type, setType] = useState("todos");
  const [radius, setRadius] = useState(10);
  const [center, setCenter] = useState(chimoio);
  const [visibleStores, setVisibleStores] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [locationMessage, setLocationMessage] = useState("A mostrar negócios perto do centro de Chimoio.");

  useEffect(() => {
    const query = new URLSearchParams({ lat: String(center[0]), lng: String(center[1]), tipo: type, raio: String(radius) });
    api(`/lojas/proximas?${query}`)
      .then((result) => { setVisibleStores(result); setLoadError(""); })
      .catch((error) => setLoadError(error.message));
  }, [center, type, radius, stores]);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationMessage("GPS indisponível; a usar a localização de Chimoio.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCenter([coords.latitude, coords.longitude]); setLocationMessage("A mostrar negócios perto da sua localização."); },
      () => setLocationMessage("Não foi possível obter GPS; a usar a localização de Chimoio.")
    );
  }

  return (
    <section className="map-page">
      <div className="page-heading"><span className="eyebrow">Descubra à sua volta</span><h1>O mapa das <em>boladas.</em></h1><p>Negócios locais, mesmo ao virar da esquina.</p></div>
      <div className="map-layout">
        <div className="map-main">
          <div className="map-controls">
            <label>Mostrar <select value={type} onChange={(event) => setType(event.target.value)}><option value="todos">Tudo</option><option value="produto">Produtos</option><option value="servico">Serviços</option></select></label>
            <label>Raio <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option></select></label>
            <button className="button button-dark location-button" onClick={locateMe}><Crosshair size={16} /> Usar meu GPS</button>
          </div>
          <div className="map-canvas">
            <MapContainer center={center} zoom={14} scrollWheelZoom className="leaflet-map">
              <Recenter center={center} />
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {visibleStores.map((store) => <CircleMarker key={store.id} center={[store.lat, store.lng]} radius={10} pathOptions={{ color: "#f8faf4", weight: 3, fillColor: "#e36b43", fillOpacity: 1 }} eventHandlers={{ click: () => onOpenStore(store) }}><Tooltip>{store.nome} · {store.distanciaKm.toFixed(1)} km</Tooltip></CircleMarker>)}
            </MapContainer>
          </div>
          <div className="map-caption"><Navigation size={14} /> {locationMessage}</div>
          {loadError && <div className="map-caption map-error">{loadError}</div>}
        </div>
        <aside className="nearby-panel">
          <div className="nearby-title"><div><span className="eyebrow">Perto de si</span><h2>{visibleStores.length} locais</h2></div><MapPin size={19} /></div>
          {visibleStores.map((store) => (
            <button className="nearby-item" key={store.id} onClick={() => onOpenStore(store)}>
              <span className="nearby-icon">{store.tipo === "produto" ? "✳" : "↗"}</span>
              <span className="nearby-copy"><b>{store.nome}</b><small>{store.bairro} · {store.distanciaKm.toFixed(1)} km</small></span>
              <span className="nearby-arrow">↗</span>
            </button>
          ))}
          {!visibleStores.length && <p className="muted-copy">Não encontrámos locais neste raio.</p>}
        </aside>
      </div>
    </section>
  );
}
