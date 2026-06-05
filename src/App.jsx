import { useState, useEffect } from "react";
import Silo from "./Silo.jsx";
import ListsApp from "./lists/ListsApp.jsx";

function getRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "lists" || hash.startsWith("lists/")) return "lists";
  return "vault";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "lists") {
    return (
      <ListsApp
        onBackToVault={() => {
          window.location.hash = "";
          setRoute("vault");
        }}
      />
    );
  }
  return <Silo onOpenLists={() => { window.location.hash = "lists"; setRoute("lists"); }} />;
}
