import VoteForm from "./components/VoteForm";

export default function OpiniaoPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Como você votaria?</h1>
      <VoteForm />
    </main>
  );
}
