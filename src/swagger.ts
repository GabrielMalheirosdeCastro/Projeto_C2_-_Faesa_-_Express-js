// OpenAPI 3.0 spec minimalista para o /docs (Swagger UI).
// O foco aqui é documentar os endpoints principais — pode expandir conforme evoluir.

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API C2 — Agendamento de Serviços',
    version: '0.1.0',
    description:
      'API REST para gestão de usuários, profissionais, serviços e agendamentos. ' +
      'Trabalho prático da Composição 2 — Faesa.',
  },
  servers: [{ url: '/', description: 'Server atual' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/healthz': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    '/auth/register': {
      post: {
        summary: 'Cria nova conta',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'name', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Criado' },
          '409': { description: 'E-mail já cadastrado' },
          '422': { description: 'Erro de validação' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Autentica e retorna JWT',
        responses: { '200': { description: 'OK' }, '401': { description: 'Credencial inválida' } },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Renova accessToken via refreshToken',
        responses: { '200': { description: 'OK' }, '401': { description: 'Token inválido' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Dados do usuário autenticado',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '401': { description: 'Não autenticado' } },
      },
    },
    '/users': {
      get: {
        summary: 'Lista usuários (ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '403': { description: 'Acesso negado' } },
      },
    },
    '/professionals': {
      get: { summary: 'Lista profissionais (público)', responses: { '200': { description: 'OK' } } },
      post: {
        summary: 'Cria perfil profissional',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/services': {
      get: { summary: 'Lista serviços (público)', responses: { '200': { description: 'OK' } } },
      post: {
        summary: 'Cria serviço (profissional)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Criado' } },
      },
    },
    '/appointments': {
      get: {
        summary: 'Lista agendamentos (próprios ou todos se ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' } },
      },
      post: {
        summary: 'Cria agendamento',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Criado' } },
      },
    },
  },
};
