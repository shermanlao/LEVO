import Spinner from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 flex justify-center">
      <Spinner />
    </div>
  );
}
