import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useRespawn } from "../context/RespawnContext";
import type { CardWithColor } from "../assets/proceduralImages";
import {
    getProceduralMascot,
    getProceduralHalo,
    getProceduralCard,
    getProceduralCard2,
    getProceduralCardHero,
    getProceduralCardContact,
} from "../assets/proceduralImages";

export function useProceduralImages(): {
    mascot: string;
    halo: string;
    card: CardWithColor;
    card2: CardWithColor;
    cardHero: CardWithColor;
    cardContact: CardWithColor;
} {
    const { pathname } = useLocation();
    const { respawnTrigger } = useRespawn();
    const roomPath = pathname || "/";
    return useMemo(
        () => ({
            mascot: getProceduralMascot(respawnTrigger, roomPath),
            halo: getProceduralHalo(respawnTrigger, roomPath),
            card: getProceduralCard(respawnTrigger, roomPath),
            card2: getProceduralCard2(respawnTrigger, roomPath),
            cardHero: getProceduralCardHero(respawnTrigger, roomPath),
            cardContact: getProceduralCardContact(respawnTrigger, roomPath),
        }),
        [respawnTrigger, roomPath]
    );
}
