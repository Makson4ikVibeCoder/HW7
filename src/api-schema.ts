// ─── Demo API Schema ──────────────────────────────────────────────────────────

export type ApiSchema = {
  "/users": {
    GET: {
      query: {
        page?: number;
        limit?: number;
      };
      response: {
        id: number;
        name: string;
        email: string;
      }[];
    };

    POST: {
      body: {
        name: string;
        email: string;
      };
      response: {
        id: number;
        name: string;
        email: string;
      };
    };
  };

  "/users/:id": {
    GET: {
      params: {
        id: string;
      };
      response: {
        id: number;
        name: string;
        email: string;
      };
    };

    PATCH: {
      params: {
        id: string;
      };
      body: {
        name?: string;
        email?: string;
      };
      response: {
        id: number;
        name: string;
        email: string;
      };
    };

    DELETE: {
      params: {
        id: string;
      };
      response: {
        success: boolean;
      };
    };
  };
};
