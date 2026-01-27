# OpenAI Cost Optimization Guide

## Overview

This document explains the cost optimization strategies implemented in Homeschoolars to minimize OpenAI API costs while maintaining educational quality.

## Cost Optimization Strategies

### 1. Prompt Segmentation & Caching

**Strategy**: Separate static (cache-eligible) prompts from dynamic (student-specific) data.

**Implementation**:
- Static prompts stored in `lib/static-prompts.ts`
- Dynamic data injected at runtime
- Prompts structured for future OpenAI cache API integration

**Cost Savings**: 
- Static prompts (~70% of input tokens) can be cached
- Estimated **40-60% reduction** in input token costs with caching enabled

**Example**:
```typescript
// Static (cacheable) - reused across all requests
const STATIC_ROADMAP_SYSTEM_PROMPT = `SYSTEM: You are an expert curriculum designer...`

// Dynamic (non-cached) - unique per student
const dynamicContent = `INPUT: { "student_profile": ${studentData} }`
```

### 2. Regeneration Guards

**Strategy**: Prevent unnecessary AI calls when data hasn't changed.

**Implementation**:
- SHA-256 hash of assessment/student data
- Check hash before calling OpenAI
- Return cached results if data unchanged

**Cost Savings**: 
- Prevents duplicate generations for same student data
- Estimated **20-30% reduction** in total API calls

**Pseudocode**:
```typescript
const dataHash = hashStudentData(studentId, assessments, profile)
const { shouldRegenerate } = await shouldRegenerateRoadmap(studentId, dataHash)

if (!shouldRegenerate) {
  return existingRoadmap // No API call
}
```

### 3. Model Selection

**Strategy**: Use cost-effective models for all routine generation.

**Implementation**:
- `gpt-4o-mini` for all content generation (roadmaps, quizzes, worksheets, insights)
- Never use full GPT-4 or GPT-4.1 for routine tasks
- Consistent model usage across all services

**Cost Comparison**:
- `gpt-4o-mini`: $0.15/$0.60 per 1M tokens (input/output)
- `gpt-4`: $2.50/$10.00 per 1M tokens
- **Savings: 94% on input, 94% on output**

### 4. Output Token Limits

**Strategy**: Limit verbosity to reduce output token costs.

**Implementation**:
- Token limits defined in `lib/openai-cache.ts`
- Applied to all `generateObject` calls
- Structured outputs preferred over prose

**Token Limits**:
```typescript
TOKEN_LIMITS = {
  roadmap: { maxOutputTokens: 2000 },
  learningProfile: { maxOutputTokens: 1500 },
  worksheet: { maxOutputTokens: 1200 },
  quiz: { maxOutputTokens: 1000 },
  insights: { maxOutputTokens: 800 },
  news: { maxOutputTokens: 600 },
}
```

**Cost Savings**: 
- Prevents excessive output generation
- Estimated **15-25% reduction** in output token costs

### 5. Database Caching

**Strategy**: Store generated content in database to avoid regeneration.

**Implementation**:
- Roadmaps stored in `LearningRoadmap` table
- Learning profiles stored in `StudentLearningProfile` table
- Worksheets/quizzes stored with unique identifiers
- Return cached results when available

**Cost Savings**: 
- Eliminates duplicate generations
- Estimated **30-40% reduction** in total API calls

## Cost Estimation

### Per-Request Costs (gpt-4o-mini)

| Content Type | Input Tokens | Output Tokens | Input Cost | Output Cost | Total Cost |
|--------------|--------------|---------------|------------|-------------|------------|
| Roadmap | ~1,500 | ~1,500 | $0.000225 | $0.000900 | $0.001125 |
| Learning Profile | ~1,200 | ~1,200 | $0.000180 | $0.000720 | $0.000900 |
| Worksheet | ~800 | ~1,000 | $0.000120 | $0.000600 | $0.000720 |
| Quiz | ~600 | ~800 | $0.000090 | $0.000480 | $0.000570 |
| Insights | ~500 | ~700 | $0.000075 | $0.000420 | $0.000495 |
| News | ~400 | ~500 | $0.000060 | $0.000300 | $0.000360 |

### Monthly Cost Estimates

**Scenario 1: Small Platform (100 students, 10 requests/student/month)**
- Total requests: 1,000/month
- Average cost per request: $0.00070
- **Monthly cost: ~$0.70**

**Scenario 2: Medium Platform (1,000 students, 15 requests/student/month)**
- Total requests: 15,000/month
- Average cost per request: $0.00070
- **Monthly cost: ~$10.50**

**Scenario 3: Large Platform (10,000 students, 20 requests/student/month)**
- Total requests: 200,000/month
- Average cost per request: $0.00070
- **Monthly cost: ~$140.00**

### Cost Savings from Optimization

**Without Optimization**:
- No prompt caching: +40% input tokens
- No regeneration guards: +25% duplicate calls
- No token limits: +20% output tokens
- Using GPT-4: +1,500% cost multiplier

**With Optimization**:
- Prompt caching: -40% input tokens
- Regeneration guards: -25% total calls
- Token limits: -20% output tokens
- Using gpt-4o-mini: -94% cost

**Estimated Total Savings: 60-70% reduction in costs**

## Implementation Details

### Static Prompts

Located in `lib/static-prompts.ts`:
- `STATIC_ROADMAP_SYSTEM_PROMPT`
- `STATIC_PROFILE_SYSTEM_PROMPT`
- `STATIC_WORKSHEET_SYSTEM_PROMPT`
- `STATIC_QUIZ_SYSTEM_PROMPT`
- `STATIC_INSIGHTS_SYSTEM_PROMPT`
- `STATIC_NEWS_SYSTEM_PROMPT`

### Regeneration Guards

Located in `lib/openai-cache.ts`:
- `hashStudentData()` - Generate hash of student data
- `shouldRegenerateRoadmap()` - Check if roadmap needs regeneration
- `shouldRegenerateProfile()` - Check if profile needs regeneration

### Token Limits

Located in `lib/openai-cache.ts`:
- `TOKEN_LIMITS` - Token limits for each content type
- `estimateCost()` - Cost estimation helper
- `calculateCacheSavings()` - Calculate savings from caching

## Future Enhancements

### 1. OpenAI Cache API Integration

When OpenAI releases cache API support in the AI SDK:
- Use `cache: true` for static prompts
- Automatic caching of system messages
- Additional 40-60% savings on input tokens

### 2. Redis Caching Layer

For even faster cache lookups:
- Store generated content in Redis
- TTL-based expiration
- Reduce database queries

### 3. Batch Processing

For bulk operations:
- Batch multiple requests
- Reduce API overhead
- Lower per-request costs

## Monitoring

### Key Metrics to Track

1. **API Calls per Day**: Monitor total OpenAI API calls
2. **Cache Hit Rate**: Track regeneration guard effectiveness
3. **Average Tokens per Request**: Monitor token usage
4. **Monthly Cost**: Track total OpenAI spending
5. **Error Rate**: Monitor API failures

### Cost Alerts

Set up alerts for:
- Daily cost exceeding $X
- Unusual spike in API calls
- High error rate (>5%)
- Cache hit rate dropping below 50%

## Best Practices

1. **Always use gpt-4o-mini** for routine generation
2. **Check regeneration guards** before calling OpenAI
3. **Apply token limits** to all generation calls
4. **Monitor costs** regularly
5. **Cache results** in database
6. **Use structured outputs** instead of prose
7. **Segment prompts** for future caching

## Troubleshooting

### High Costs

1. Check for duplicate generations (regeneration guards)
2. Verify token limits are applied
3. Ensure gpt-4o-mini is used (not GPT-4)
4. Review cache hit rates

### Slow Performance

1. Check database query performance
2. Verify regeneration guards aren't blocking valid requests
3. Review prompt length (shorter = faster)

### Quality Issues

1. Ensure token limits aren't too restrictive
2. Verify static prompts are comprehensive
3. Check dynamic data is properly formatted
