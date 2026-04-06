import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

interface Book {
  id: number;
  title: string;
  author: string;
  created_at: string;
}

// 임시 코드 추후 tanstack 활용할 것
export const ApiTest = () => {
  const [data, setData] = useState<Book[] | null>(null);

  useEffect(() => {
    supabase
      .from("books")
      .select("*")
      .then(({ data }) => {
        setData(data);
      });
  }, []);

  return (
    <div>
      <ul>
        {data?.map((book) => (
          <li key={book.id}>
            <strong>{book.title}</strong> — {book.author}
          </li>
        ))}
      </ul>
      <div>books</div>
    </div>
  );
};
