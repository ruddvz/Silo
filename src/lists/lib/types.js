/** @typedef {'document' | 'text-note' | 'shared-list'} SiloFileType */

/**
 * @typedef {Object} ListUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} [createdAt]
 */

/**
 * @typedef {Object} SharedSpace
 * @property {string} id
 * @property {string} name
 * @property {string} inviteCode
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {Array<{ userId: string, name: string, role: string }>} members
 */

/**
 * @typedef {Object} SharedListFile
 * @property {string} id
 * @property {'shared-list'} type
 * @property {string} title
 * @property {string} spaceId
 * @property {string} ownerId
 * @property {string} createdBy
 * @property {string} [updatedBy]
 * @property {string} [color]
 * @property {string} [notes]
 * @property {string} rawText
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ListItem
 * @property {string} id
 * @property {string} fileId
 * @property {string} text
 * @property {boolean} checked
 * @property {boolean} [important]
 * @property {number} sortOrder
 * @property {string} createdBy
 * @property {string} [completedBy]
 * @property {string} createdAt
 * @property {string} [updatedAt]
 * @property {string} [completedAt]
 */

/**
 * @typedef {Object} ActivityEntry
 * @property {string} id
 * @property {string} spaceId
 * @property {string} [fileId]
 * @property {string} actorId
 * @property {string} actorName
 * @property {string} action
 * @property {string} [itemText]
 * @property {string} [fileTitle]
 * @property {string} createdAt
 */

export {};
