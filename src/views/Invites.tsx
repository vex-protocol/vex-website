import ax from "axios";
import { Hero, Avatar } from "../components";
import { useMemo, useRef, useState } from "react";
import { IInvite, IServer, IUser } from "../Router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import msgpack from "msgpack-lite";
import { API_ENDPOINTS } from "../components/constants";

export function Invites(props: { match: any }): JSX.Element {
    const [serverDetails, setServerDetails] = useState(null as IServer | null);
    const [inviteDetails, setInviteDetails] = useState(null as IInvite | null);
    const [inviterDetails, setInviterDetails] = useState(null as IUser | null);
    const [expired, setExpired] = useState(false);
    const [fetching, setFetching] = useState(true);
    const ref = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState("");

    const [missing, setMissing] = useState(false);

    useMemo(async () => {
        let inviteRes;
        try {
            inviteRes = await ax.get(
                API_ENDPOINTS.INVITE(props.match.params.id),
                { responseType: "arraybuffer" }
            );
        } catch (err) {
            console.log("Setting missing.");
            setMissing(true);
            setFetching(false);
            return;
        }

        const inviteDet = msgpack.decode(new Uint8Array(inviteRes.data));
        setInviteDetails(inviteDet);

        if (new Date(inviteDet.expiration).getTime() < Date.now()) {
            setExpired(true);
            setFetching(false);
            return;
        }

        const inviterRes = await ax.get(API_ENDPOINTS.USER(inviteDet.owner), {
            responseType: "arraybuffer",
        });
        setInviterDetails(msgpack.decode(new Uint8Array(inviterRes.data)));

        const serverRes = await ax.get(
            API_ENDPOINTS.SERVER(inviteDet.serverID),
            { responseType: "arraybuffer" }
        );
        setServerDetails(msgpack.decode(new Uint8Array(serverRes.data)));
        setFetching(false);
    }, [props.match.params.id]);

    if (fetching) {
        return (
            <div className="view">
                <Hero content={<span />} />
            </div>
        );
    }

    if (expired) {
        return (
            <div className="view">
                <Hero
                    content={
                        <div>
                            <h1 className="title">
                                Uh oh, that invite's expired.
                            </h1>
                            <p>Ask your friend for a new one.</p>
                        </div>
                    }
                />
            </div>
        );
    }

    if (missing) {
        return (
            <div className="view">
                <Hero
                    content={
                        <div>
                            <h1 className="title">
                                Uh oh, that invite couldn't be found.
                            </h1>
                            <p>Ask your friend for a new one.</p>
                        </div>
                    }
                />
            </div>
        );
    }

    return (
        <div className="view">
            <Hero
                content={
                    <div>
                        <h1 className="title">Lucky you, you're invited.</h1>
                        <div className="columns">
                            <div className="column is-narrow">
                                {inviterDetails && (
                                    <Avatar
                                        hash={Date.now()}
                                        user={inviterDetails}
                                    />
                                )}
                            </div>
                            <div className="column is-narrow">
                                {inviterDetails && inviterDetails.username} has
                                invited you to{" "}
                                <strong>{serverDetails?.name || ""}</strong>
                            </div>
                        </div>
                        <button
                            className="button"
                            onClick={() => {
                                window.open(
                                    "vex://" + inviteDetails?.inviteID,
                                    "_self"
                                );
                            }}
                        >
                            Join
                        </button>
                        <br />
                        <br />

                        <div className="input-wrapper">
                            <label className="help copy-text has-text-weight-bold">
                                Or, copy this invite code / url into your
                                client.{" "}
                                <span className="has-text-grey">{copied}</span>
                            </label>
                            <div className="field has-addons">
                                <p
                                    className="control"
                                    onClick={(event) => {
                                        console.log(inviteDetails?.inviteID);
                                        ref.current?.select();
                                        setCopied("Copied!");
                                        document.execCommand("copy");
                                        setTimeout(() => {
                                            setCopied("");
                                        }, 1500);
                                    }}
                                >
                                    <button className="button no-padding is-light">
                                        <FontAwesomeIcon icon={faCopy} />
                                    </button>
                                </p>
                                <p className="control is-expanded">
                                    <input
                                        ref={ref}
                                        readOnly
                                        className="input"
                                        value={inviteDetails?.inviteID || ""}
                                    />
                                </p>
                            </div>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
