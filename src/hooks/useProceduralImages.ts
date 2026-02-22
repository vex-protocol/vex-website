import { useMemo } from "react";
import { useRespawn } from "../context/RespawnContext";
import {
    getProceduralMascot,
    getProceduralHalo,
    getProceduralCard,
    getProceduralCard2,
} from "../assets/proceduralImages";

export function useProceduralImages(): {
    mascot: string;
    halo: string;
    card: string;
    card2: string;
} {
    const { respawnTrigger } = useRespawn();
    return useMemo(
        () => ({
            mascot: getProceduralMascot(respawnTrigger),
            halo: getProceduralHalo(respawnTrigger),
            card: getProceduralCard(respawnTrigger),
            card2: getProceduralCard2(respawnTrigger),
        }),
        [respawnTrigger]
    );
}
