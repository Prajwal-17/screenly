declare const migrations: {
  journal: {
    entries: { idx: number; tag: string; when: number; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
};

export default migrations;
