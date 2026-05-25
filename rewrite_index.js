const fs = require('fs');
let code = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');

// 1. Imports
if (!code.includes('@shopify/flash-list')) {
  code = code.replace("import {", "import { FlashList } from '@shopify/flash-list';\nimport {");
  code = code.replace("const LANGUAGES = [", "const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);\nconst LANGUAGES = [");
}

// 2. Find the ScrollView tag
const svStartTag = `<Animated.ScrollView`;
const svEndTag = `</Animated.ScrollView>`;

const svStart = code.indexOf(svStartTag);
const svEnd = code.lastIndexOf(svEndTag);

if (svStart > -1 && svEnd > -1) {
  const beforeSv = code.substring(0, svStart);
  const afterSv = code.substring(svEnd + svEndTag.length);
  const svContentStr = code.substring(svStart, svEnd + svEndTag.length);

  // We know the end of the opening tag is `// No stickyHeaderIndices — pinned chrome uses a fixed overlay to avoid layout drift\n        >`
  const openingEnd = svContentStr.indexOf('>') + 1;
  const openingStr = svContentStr.substring(0, openingEnd);
  
  // The rest of the content
  const childrenStr = svContentStr.substring(openingEnd, svContentStr.length - svEndTag.length);

  // Split childrenStr by child[3]:
  const child3Marker = `{/* child[3]: Job cards — only for seeker */}`;
  const splitIdx = childrenStr.indexOf(child3Marker);
  
  if (splitIdx > -1) {
    const listHeaderContent = childrenStr.substring(0, splitIdx).trim();
    
    // Instead of parsing the jobs array, we can just use FlashList
    const newFlashList = openingStr.replace('Animated.ScrollView', 'AnimatedFlashList') + `
          data={activeViewRole === 'seeker' && !isLoadingJobs ? paginatedJobs : []}
          estimatedItemSize={250}
          ListHeaderComponent={
            <>
              ${listHeaderContent}
            </>
          }
          ListEmptyComponent={
            activeViewRole === 'seeker' && !isLoadingJobs && paginatedJobs.length === 0 ? renderEmpty() : null
          }
          ListFooterComponent={
            activeViewRole === 'seeker' ? (
              <View style={[styles.jobListContainer, { minHeight: jobListMinHeight, paddingTop: JOB_LIST_TOP_GAP }]}>
                 {isLoadingJobs && !jobsData && [1, 2, 3].map((i) => <JobCardSkeleton key={i} />)}
                 {renderFooter()}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <JobCard
                job={item}
                onPress={(j) => router.push(\`/job/\${j.id}\`)}
                onApply={(j) => router.push(\`/job/\${j.id}\`)}
              />
            </View>
          )}
        />`;
    
    code = beforeSv + newFlashList + afterSv;
    fs.writeFileSync('app/(tabs)/index.tsx', code);
    console.log("Successfully rewrote index.tsx to use FlashList!");
  } else {
    console.log("Could not find child[3] marker");
  }
} else {
  console.log("Could not find Animated.ScrollView");
}

