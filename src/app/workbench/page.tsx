import { MembershipRequired, Screen } from "@/components/screen";
export default function WorkbenchPage() {
  return (
    <Screen title="Research Workbench">
      <MembershipRequired />
    </Screen>
  );
}
