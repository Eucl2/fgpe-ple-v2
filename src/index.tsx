import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { ThemeProvider } from "@emotion/react";
import { themes } from "./styles/theme/themes";
import GlobalStyle from "./styles/GlobalStyle";

ReactDOM.render(
  <React.StrictMode>
    <GlobalStyle />
    <ThemeProvider theme={true ? themes.light : themes.dark}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
