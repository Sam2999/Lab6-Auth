"use strict";

// Imports
const express = require("express");
const session = require("express-session");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const { auth } = require("express-openid-connect");
const { requiresAuth } = require("express-openid-connect");
var cons = require("consolidate");
var path = require("path");
let app = express();

// ✅ Habilitar dotenv para local
const dotenv = require("dotenv");
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw new Error(`Failed to load .env file: ${dotenvResult.error.message}`);
}

//  Esto se los dará Okta.
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,         
  clientID: process.env.OKTA_CLIENT_ID,
  issuerBaseURL: process.env.OKTA_ISSUER_URI, // sin tocar
};

let oidc = new ExpressOIDC({
  issuer: process.env.OKTA_ISSUER_URI,
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  redirect_uri: process.env.REDIRECT_URI, 
  routes: { callback: {defaultRedirect: "https://lab6-auth.vercel.app/dashboard"} },
  scope: "openid profile",
});

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// MVC View Setup
app.engine("html", cons.swig);
app.set("views", path.join(__dirname, "views"));
app.set("models", path.join(__dirname, "models"));
app.set("view engine", "html");

// App middleware
app.use("/static", express.static("static"));

app.use(
  session({
    cookie: { httpOnly: true },
    secret: process.env.SECRET,
  })
);

// App routes
app.use(oidc.router);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/dashboard", requiresAuth(), (req, res) => {
  var payload = Buffer.from(
    req.appSession.id_token.split(".")[1],
    "base64"
  ).toString("utf-8");
  const userInfo = JSON.parse(payload);
  res.render("dashboard", { user: userInfo });
});

const openIdClient = require("openid-client");
openIdClient.Issuer.defaultHttpOptions.timeout = 20000;

oidc.on("ready", () => {
  console.log("Server running on port: " + process.env.PORT);
  app.listen(parseInt(process.env.PORT));
});

oidc.on("error", (err) => {
  console.error(err);
});
