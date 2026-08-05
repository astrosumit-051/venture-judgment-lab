import { getChatGPTUser } from "./chatgpt-auth";
import { LabApp } from "./LabApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  const displayName = user?.fullName?.split(" ")[0] ?? "Sumit";

  return <LabApp displayName={displayName} />;
}
