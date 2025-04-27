-- CreateTable
CREATE TABLE `Nsu` (
    `idNsuUser` INTEGER NOT NULL AUTO_INCREMENT,
    `realName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `group` VARCHAR(10) NOT NULL,
    `hasLogined` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Nsu_email_key`(`email`),
    PRIMARY KEY (`idNsuUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Users` (
    `idUser` INTEGER NOT NULL,
    `displayedName` VARCHAR(255) NOT NULL,
    `pic` VARCHAR(255) NULL,
    `admin` BOOLEAN NOT NULL DEFAULT false,
    `password` VARCHAR(255) NULL,

    PRIMARY KEY (`idUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `idPost` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `images` TEXT NULL,
    `tags` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `views` INTEGER NOT NULL DEFAULT 0,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `createdByIdUser` INTEGER NOT NULL,

    PRIMARY KEY (`idPost`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `idComment` INTEGER NOT NULL AUTO_INCREMENT,
    `commentIdPost` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `images` TEXT NULL,
    `likes` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdByIdUser` INTEGER NOT NULL,

    PRIMARY KEY (`idComment`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `idTag` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Tag_name_key`(`name`),
    PRIMARY KEY (`idTag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserFollowedTag` (
    `idUser` INTEGER NOT NULL,
    `idTag` INTEGER NOT NULL,

    PRIMARY KEY (`idUser`, `idTag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLikedPost` (
    `idUser` INTEGER NOT NULL,
    `idPost` INTEGER NOT NULL,

    PRIMARY KEY (`idUser`, `idPost`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLikedComment` (
    `idUser` INTEGER NOT NULL,
    `idComment` INTEGER NOT NULL,

    PRIMARY KEY (`idUser`, `idComment`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserViewedPost` (
    `idUser` INTEGER NOT NULL,
    `idPost` INTEGER NOT NULL,

    PRIMARY KEY (`idUser`, `idPost`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Users` ADD CONSTRAINT `Users_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Nsu`(`idNsuUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_createdByIdUser_fkey` FOREIGN KEY (`createdByIdUser`) REFERENCES `Users`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_commentIdPost_fkey` FOREIGN KEY (`commentIdPost`) REFERENCES `Post`(`idPost`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_createdByIdUser_fkey` FOREIGN KEY (`createdByIdUser`) REFERENCES `Users`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollowedTag` ADD CONSTRAINT `UserFollowedTag_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserFollowedTag` ADD CONSTRAINT `UserFollowedTag_idTag_fkey` FOREIGN KEY (`idTag`) REFERENCES `Tag`(`idTag`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLikedPost` ADD CONSTRAINT `UserLikedPost_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLikedPost` ADD CONSTRAINT `UserLikedPost_idPost_fkey` FOREIGN KEY (`idPost`) REFERENCES `Post`(`idPost`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLikedComment` ADD CONSTRAINT `UserLikedComment_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLikedComment` ADD CONSTRAINT `UserLikedComment_idComment_fkey` FOREIGN KEY (`idComment`) REFERENCES `Comment`(`idComment`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserViewedPost` ADD CONSTRAINT `UserViewedPost_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `Users`(`idUser`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserViewedPost` ADD CONSTRAINT `UserViewedPost_idPost_fkey` FOREIGN KEY (`idPost`) REFERENCES `Post`(`idPost`) ON DELETE CASCADE ON UPDATE CASCADE;
