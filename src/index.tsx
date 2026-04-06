import React from "react";
import ReactDOM from "react-dom";
import { Router } from "./Router";
import "./tailwind.css";
import "./stylesheets/colors.sass";
import "./stylesheets/old-style.scss";
import "./stylesheets/style.sass";

ReactDOM.render(
    <React.StrictMode>
        <Router />
    </React.StrictMode>,
    document.getElementById("root")
);
