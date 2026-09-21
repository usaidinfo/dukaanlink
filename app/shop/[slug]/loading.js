import { AppSkeleton } from "../../../components/skeleton-screen";

export default function Loading() {
  return (
    <div className="page">
      <AppSkeleton variant="shop" />
    </div>
  );
}
