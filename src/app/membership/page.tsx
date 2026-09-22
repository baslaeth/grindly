import { MembershipRequired, Screen } from "@/components/screen";
export default function MembershipPage() {
  return (
    <Screen title="My Membership">
      <MembershipRequired />
    </Screen>
  );
}
