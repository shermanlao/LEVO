import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ProductCodeSequence extends Model {
  declare prefix: string;
  declare last_n: number;
}

ProductCodeSequence.init(
  {
    prefix: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    last_n: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'ProductCodeSequence',
    tableName: 'product_code_sequences',
    timestamps: false,
  }
);

export default ProductCodeSequence;
