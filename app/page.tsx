import { GuideHeader } from "@/components/guide-header";
import { LabManual } from "@/components/lab-manual";
import { loadLabFiles } from "@/lib/lab-files";

export default async function Page() {
  const files = await loadLabFiles();

  return (
    <>
      <GuideHeader current="guide" />
      <LabManual files={files} />
    </>
  );
}
