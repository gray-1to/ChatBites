import React, { useState } from "react";
import GoogleMapReact from "google-map-react";

type Reccomendation = {
  displayName: string;
  googleMapsUri: string;
  location: {
    lat: number;
    lng: number;
  };
};

export type ModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  recommendations: Reccomendation[];
  center: {
    lat: number;
    lng: number;
  };
};

const MapModal = (props: ModalProps) => {
  // @ts-expect-error google not found
  const [activeMarker, setActiveMarker] = useState<google.maps.Marker | null>(null);
  // @ts-expect-error google not found
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);

  // @ts-expect-error map, maps: any
  const handleApiLoaded = ({ map, maps }) => {
    const bounds = new maps.LatLngBounds();
    const infoWindowInstance = new maps.InfoWindow(); // InfoWindowインスタンスを作成

    props.recommendations.forEach((recommendation) => {
      const marker = new maps.Marker({
        map,
        position: recommendation.location,
      });

      // マーカークリック時にInfoWindowを開く
      marker.addListener("click", () => {
        if (activeMarker) {
          infoWindow.close(); // 既存のInfoWindowを閉じる
        }

        setActiveMarker(marker);

        // Google Mapsの経路検索URLを構成
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${recommendation.location.lat},${recommendation.location.lng}`;

        infoWindowInstance.setContent(
          `<div style="display: flex;flex-direction: column;align-items: center;">
             <h3>${recommendation.displayName}</h3>
             <a href="${recommendation.googleMapsUri}" target="_blank" rel="noopener noreferrer">Google Mapsで開く</a><br/>
             <button onclick="window.open('${directionsUrl}', '_blank')">経路検索</button>
           </div>`
        );
        infoWindowInstance.open(map, marker);
        setInfoWindow(infoWindowInstance);
      });

      bounds.extend(marker.position);
    });

    map.fitBounds(bounds);
  };

  return props.open ? (
    <>
      <div className="bg-white top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-start fixed z-20">
        <div style={{ height: "500px", width: "500px" }}>
          <GoogleMapReact
            bootstrapURLKeys={{
              key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
            }}
            defaultCenter={props.center}
            defaultZoom={14}
            onGoogleApiLoaded={handleApiLoaded}
          />
        </div>
      </div>
      <div
        className="fixed bg-black bg-opacity-50 w-full h-full z-10"
        onClick={() => props.onCancel()}
      ></div>
    </>
  ) : (
    <></>
  );
};

export default MapModal;

