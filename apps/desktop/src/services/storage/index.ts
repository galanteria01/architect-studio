import type { Project, ProjectSummary } from "@/types";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Backend-agnostic persistence surface used by the app. */
export interface StorageBackend {
  listProjects(): Promise<ProjectSummary[]>;
  getProject(uuid: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  deleteProject(uuid: string): Promise<void>;
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;
  listFavorites(): Promise<string[]>;
  toggleFavorite(componentType: string): Promise<string[]>;
}

// ---------------------------------------------------------------- SQLite (Tauri)

const DB_URL = "sqlite:architect_studio.db";

class SqlBackend implements StorageBackend {
  private dbPromise: Promise<import("@tauri-apps/plugin-sql").default> | null =
    null;

  private async db() {
    if (!this.dbPromise) {
      this.dbPromise = import("@tauri-apps/plugin-sql").then((m) =>
        m.default.load(DB_URL),
      );
    }
    return this.dbPromise;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const db = await this.db();
    return db.select<ProjectSummary[]>(
      `SELECT id, uuid, name, description, updated_at as updatedAt
       FROM projects ORDER BY updated_at DESC`,
    );
  }

  async getProject(uuid: string): Promise<Project | null> {
    const db = await this.db();
    const rows = await db.select<
      {
        id: number;
        uuid: string;
        name: string;
        description: string;
        graph: string;
        created_at: number;
        updated_at: number;
      }[]
    >(`SELECT * FROM projects WHERE uuid = $1`, [uuid]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      uuid: r.uuid,
      name: r.name,
      description: r.description,
      graph: JSON.parse(r.graph),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async saveProject(project: Project): Promise<void> {
    const db = await this.db();
    await db.execute(
      `INSERT INTO projects (uuid, name, description, graph, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(uuid) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         graph = excluded.graph,
         updated_at = excluded.updated_at`,
      [
        project.uuid,
        project.name,
        project.description,
        JSON.stringify(project.graph),
        project.createdAt,
        project.updatedAt,
      ],
    );
  }

  async deleteProject(uuid: string): Promise<void> {
    const db = await this.db();
    await db.execute(`DELETE FROM projects WHERE uuid = $1`, [uuid]);
  }

  async getPreference(key: string): Promise<string | null> {
    const db = await this.db();
    const rows = await db.select<{ value: string }[]>(
      `SELECT value FROM preferences WHERE key = $1`,
      [key],
    );
    return rows.length ? rows[0].value : null;
  }

  async setPreference(key: string, value: string): Promise<void> {
    const db = await this.db();
    await db.execute(
      `INSERT INTO preferences (key, value) VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  async listFavorites(): Promise<string[]> {
    const db = await this.db();
    const rows = await db.select<{ component_type: string }[]>(
      `SELECT component_type FROM component_favorites ORDER BY created_at DESC`,
    );
    return rows.map((r) => r.component_type);
  }

  async toggleFavorite(componentType: string): Promise<string[]> {
    const db = await this.db();
    const existing = await db.select<{ component_type: string }[]>(
      `SELECT component_type FROM component_favorites WHERE component_type = $1`,
      [componentType],
    );
    if (existing.length) {
      await db.execute(
        `DELETE FROM component_favorites WHERE component_type = $1`,
        [componentType],
      );
    } else {
      await db.execute(
        `INSERT INTO component_favorites (component_type, created_at) VALUES ($1, $2)`,
        [componentType, Date.now()],
      );
    }
    return this.listFavorites();
  }
}

// ----------------------------------------------------------- localStorage (web)

class LocalBackend implements StorageBackend {
  private key(suffix: string) {
    return `architect-studio:${suffix}`;
  }

  private read<T>(suffix: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.key(suffix));
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private write<T>(suffix: string, value: T) {
    localStorage.setItem(this.key(suffix), JSON.stringify(value));
  }

  private projects(): Record<string, Project> {
    return this.read<Record<string, Project>>("projects", {});
  }

  async listProjects(): Promise<ProjectSummary[]> {
    return Object.values(this.projects())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((p, i) => ({
        id: p.id ?? i,
        uuid: p.uuid,
        name: p.name,
        description: p.description,
        updatedAt: p.updatedAt,
      }));
  }

  async getProject(uuid: string): Promise<Project | null> {
    return this.projects()[uuid] ?? null;
  }

  async saveProject(project: Project): Promise<void> {
    const all = this.projects();
    all[project.uuid] = project;
    this.write("projects", all);
  }

  async deleteProject(uuid: string): Promise<void> {
    const all = this.projects();
    delete all[uuid];
    this.write("projects", all);
  }

  async getPreference(key: string): Promise<string | null> {
    return this.read<Record<string, string>>("prefs", {})[key] ?? null;
  }

  async setPreference(key: string, value: string): Promise<void> {
    const prefs = this.read<Record<string, string>>("prefs", {});
    prefs[key] = value;
    this.write("prefs", prefs);
  }

  async listFavorites(): Promise<string[]> {
    return this.read<string[]>("favorites", []);
  }

  async toggleFavorite(componentType: string): Promise<string[]> {
    const favs = new Set(this.read<string[]>("favorites", []));
    if (favs.has(componentType)) favs.delete(componentType);
    else favs.add(componentType);
    const next = [...favs];
    this.write("favorites", next);
    return next;
  }
}

let backend: StorageBackend | null = null;

export function storage(): StorageBackend {
  if (!backend) {
    backend = isTauri() ? new SqlBackend() : new LocalBackend();
  }
  return backend;
}
