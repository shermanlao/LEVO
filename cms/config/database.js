module.exports = ({ env }) => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: env('DATABASE_FILENAME', '../../levo-website/backend/database.sqlite'),
    },
    useNullAsDefault: true,
  },
}); 