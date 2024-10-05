import React from "react";
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
  const handleApiLoaded = ({ map, maps }) => {
    const bounds = new maps.LatLngBounds();

    // マーカーを作成し、クリックイベントを追加
    props.recommendations.forEach((recommendation) => {
      const marker = new maps.Marker({
        map,
        position: recommendation["location"],
      });

      // マーカーをクリックしたときに別タブでgoogleMapsUriを開く
      marker.addListener("click", () => {
        window.open(recommendation.googleMapsUri, "_blank");
      });

      bounds.extend(marker.position);
    });

    map.fitBounds(bounds);
  };

  return props.open ? (
    <>
      <div className="bg-white  top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-start absolute z-20">
        <div style={{ height: "500px", width: "500px" }}>
          <GoogleMapReact
            bootstrapURLKeys={{
              key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
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
