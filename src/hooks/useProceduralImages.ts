import { useMemo } from "react";
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
    const { respawnTrigger } = useRespawn();
    return useMemo(
        () => ({
            mascot: getProceduralMascot(respawnTrigger),
            halo: getProceduralHalo(respawnTrigger),
            card: getProceduralCard(respawnTrigger),
            card2: getProceduralCard2(respawnTrigger),
            cardHero: getProceduralCardHero(respawnTrigger),
            cardContact: getProceduralCardContact(respawnTrigger),
        }),
        [respawnTrigger]
    );
}
