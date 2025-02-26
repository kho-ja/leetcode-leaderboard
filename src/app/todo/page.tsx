import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient();
  const { data: todos } = await supabase.from('todos').select();

  console.log("todos: ", todos);

  return (
    <ul>
      {todos?.map((todo, index) => (
        <li key={todo.id || index}>{JSON.stringify(todo)}</li>
      ))}
    </ul>
  );
}
