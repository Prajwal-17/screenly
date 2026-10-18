import { expect, test } from "bun:test";
import { SpeechCaptions } from "./speech-captions";

test("captions reveal played words, never queued phrases or wall-clock progress", () => {
  const captions = new SpeechCaptions();
  captions.add("One two three four. ", 0, 4);
  captions.add("Five six seven eight.", 4, 4);
  expect(captions.at(0)).toBe("");
  expect(captions.at(0.1)).toBe("One");
  expect(captions.at(1)).toBe("One two");
  expect(captions.at(1)).toBe("One two"); // A stalled device has no new played samples.
  expect(captions.at(3)).not.toContain("Five");
  expect(captions.at(4)).toBe("One two three four.");
  expect(captions.at(4.1)).toBe("One two three four. Five");
  expect(captions.at(8)).toBe("One two three four. Five six seven eight.");
});

test("late phrases do not reveal until their audio starts; a new turn starts empty", () => {
  const captions = new SpeechCaptions();
  captions.add("An opening.", 0, 2);
  expect(captions.at(2)).toBe("An opening.");
  captions.add(" A later phrase.", 2, 3);
  expect(captions.at(2)).toBe("An opening.");
  expect(captions.at(2.01)).toBe("An opening. A");
  expect(new SpeechCaptions().at(0)).toBe("");
});
