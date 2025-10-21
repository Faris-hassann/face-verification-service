const { DataTypes } = require('sequelize');
const dbConfig = require('../config/db.config');
const config = require('../config/env.config');

const UserEmbedding = dbConfig.getSequelize().define('UserEmbedding', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the user',
  },
  embedding: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '512-dimensional facial embedding vector',
    validate: {
      isValidEmbedding(value) {
        if (!Array.isArray(value)) {
          throw new Error('Embedding must be an array');
        }
        if (value.length !== config.model.embeddingDimension) {
          throw new Error(`Embedding must have ${config.model.embeddingDimension} dimensions`);
        }
        if (!value.every(val => typeof val === 'number' && !isNaN(val))) {
          throw new Error('All embedding values must be valid numbers');
        }
      }
    }
  },
  imageHash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hash of the original image for verification',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the user or image',
    defaultValue: {}
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this embedding is active for verification',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'user_embeddings',
  indexes: [
    {
      fields: ['userId'],
      unique: true
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeUpdate: (instance) => {
      instance.updatedAt = new Date();
    }
  }
});

// Instance methods
UserEmbedding.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Don't expose internal fields in API responses
  delete values.updatedAt;
  
  return values;
};

// Class methods
UserEmbedding.findByUserId = async function(userId) {
  return await this.findOne({
    where: { userId, isActive: true }
  });
};

UserEmbedding.createEmbedding = async function(userId, embedding, imageHash = null, metadata = {}) {
  return await this.create({
    userId,
    embedding,
    imageHash,
    metadata,
    isActive: true
  });
};

UserEmbedding.updateEmbedding = async function(userId, embedding, imageHash = null, metadata = {}) {
  const [updatedRowsCount] = await this.update({
    embedding,
    imageHash,
    metadata,
    updatedAt: new Date()
  }, {
    where: { userId, isActive: true }
  });
  
  if (updatedRowsCount === 0) {
    throw new Error(`No active embedding found for user: ${userId}`);
  }
  
  return await this.findByUserId(userId);
};

UserEmbedding.deactivateEmbedding = async function(userId) {
  const [updatedRowsCount] = await this.update({
    isActive: false,
    updatedAt: new Date()
  }, {
    where: { userId }
  });
  
  return updatedRowsCount > 0;
};

UserEmbedding.getAllActiveEmbeddings = async function() {
  return await this.findAll({
    where: { isActive: true },
    attributes: ['userId', 'embedding', 'metadata', 'createdAt']
  });
};

module.exports = UserEmbedding;
