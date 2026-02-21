import { Fragment } from "react";
import { ReleaseLinks, Hero } from "../components";

export function Download(): JSX.Element {
    return (
        <Fragment>
            <Hero content={<ReleaseLinks />} />
        </Fragment>
    );
}
