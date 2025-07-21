import { createRoot } from "react-dom/client";
import { ReactTogether } from "react-together";
import { AppKitProvider } from "./reown.tsx";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ReactTogether
    sessionParams={{
      apiKey: "2UyoWWPeshm6dVAzSbiuCIljeH5hPmi0eu6jVVQakZ",
      appId: "com.exampsssqsle.myapp",
      name: "tests-sesdsdsqdqsqsssssionsss",
      password: "test-password",
    }}
  >
    <AppKitProvider>
      <App />
    </AppKitProvider>
  </ReactTogether>
);
