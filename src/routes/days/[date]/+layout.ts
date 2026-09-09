export function load({ params }: { params: { date: string } }) {
  return { date: params.date };
}
