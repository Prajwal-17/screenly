import { expect, test } from "bun:test";
import { speechPhrase } from "../src/lib/speechPhrase";

test("speech phrases preserve words and punctuation across token boundaries", () => {
  expect(speechPhrase("How does concurrent rend")).toBeNull();
  expect(speechPhrase("Welcome. ")).toBeNull();
  expect(
    speechPhrase("Welcome. Let's begin with React. How would you test it?"),
  ).toBe("Welcome. Let's begin with React.");
  expect(
    speechPhrase("How does concurrent rendering work? Next question."),
  ).toBe("How does concurrent rendering work?");
  expect(speechPhrase("Compare React 19.2 with earlier releases", true)).toBe(
    "Compare React 19.2 with earlier releases",
  );
  const long = "one two three four five six seven eight nine ten eleven twelve";
  expect(speechPhrase(long)).toBe(
    "one two three four five six seven eight nine ten ",
  );
});
