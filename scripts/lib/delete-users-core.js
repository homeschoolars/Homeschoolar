/**
 * Shared Prisma transaction: remove users and dependent rows that would block FK deletes.
 * Children and most child-scoped rows cascade when the parent User row is deleted.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string[]} userIds
 * @param {string[]} tokenIdentifiers Lowercased emails for verification_tokens.identifier
 */
async function deleteUsersTransaction(prisma, userIds, tokenIdentifiers) {
  const empty = {
    analytics: 0,
    paymentTransactions: 0,
    payments: 0,
    subscriptions: 0,
    worksheetsOrphaned: 0,
    blogPostsDetached: 0,
    videoLecturesDetached: 0,
    orphanReviewsCleared: 0,
    verificationTokens: 0,
    users: 0,
  }

  if (!userIds.length) {
    return empty
  }

  return prisma.$transaction(async (tx) => {
    const children = await tx.child.findMany({
      where: { parentId: { in: userIds } },
      select: { id: true },
    })
    const childIds = children.map((c) => c.id)

    const analytics = await tx.analyticsEvent.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, ...(childIds.length ? [{ childId: { in: childIds } }] : [])],
      },
    })

    const subs = await tx.subscription.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    })
    const subIds = subs.map((s) => s.id)

    const payTx = await tx.paymentTransaction.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, ...(subIds.length ? [{ subscriptionId: { in: subIds } }] : [])],
      },
    })

    await tx.payment.updateMany({
      where: { verifiedBy: { in: userIds } },
      data: { verifiedBy: null },
    })

    const payments = await tx.payment.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          ...(subIds.length ? [{ subscriptionId: { in: subIds } }] : []),
        ],
      },
    })

    const subscriptions = await tx.subscription.deleteMany({
      where: { userId: { in: userIds } },
    })

    const worksheets = await tx.worksheet.updateMany({
      where: { createdBy: { in: userIds } },
      data: { createdBy: null },
    })

    const posts = await tx.blogPost.updateMany({
      where: { authorId: { in: userIds } },
      data: { authorId: null },
    })

    const lectures = await tx.videoLecture.updateMany({
      where: { createdBy: { in: userIds } },
      data: { createdBy: null },
    })

    const orphans = await tx.orphanVerification.updateMany({
      where: { reviewedByAdminId: { in: userIds } },
      data: { reviewedByAdminId: null },
    })

    let tokens = { count: 0 }
    if (tokenIdentifiers.length) {
      tokens = await tx.verificationToken.deleteMany({
        where: { identifier: { in: tokenIdentifiers } },
      })
    }

    const users = await tx.user.deleteMany({
      where: { id: { in: userIds } },
    })

    return {
      analytics: analytics.count,
      paymentTransactions: payTx.count,
      payments: payments.count,
      subscriptions: subscriptions.count,
      worksheetsOrphaned: worksheets.count,
      blogPostsDetached: posts.count,
      videoLecturesDetached: lectures.count,
      orphanReviewsCleared: orphans.count,
      verificationTokens: tokens.count,
      users: users.count,
    }
  })
}

module.exports = { deleteUsersTransaction }
