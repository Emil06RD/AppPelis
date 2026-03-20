const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Genre = require('./Genre');

const Series = sequelize.define('Series', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    posterUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'https://via.placeholder.com/300x450?text=No+Poster'
    },
    status: {
        type: DataTypes.ENUM('Watching', 'Watched', 'Plan to Watch'),
        allowNull: false,
        defaultValue: 'Plan to Watch'
    }
}, {
    timestamps: true
});

// Associations
Genre.hasMany(Series, { foreignKey: 'GenreId', onDelete: 'SET NULL' });
Series.belongsTo(Genre, { foreignKey: 'GenreId' });

module.exports = Series;
