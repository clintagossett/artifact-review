import { PublicSharePage } from "@/components/share/PublicSharePage";

interface Props {
  params: Promise<{ token: string; path?: string[] }>;
}

export default async function Page({ params }: Props) {
  const { token, path } = await params;
  const filePath = path ? path.join("/") : undefined;
  return <PublicSharePage token={token} filePath={filePath} />;
}
